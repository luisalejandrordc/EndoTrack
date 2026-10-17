<?php
require_once __DIR__ . '/config.php';
date_default_timezone_set('America/Lima');

// task_no => [name, recommended duration in days (null = none), dependencies, customer milestone]
const TASKS = [
    1  => ['Cotización del Vehículo',      null, [],     1],
    2  => ['Debida Diligencia del Cliente', 3,   [1],    1],
    3  => ['Liquidación de Unidad',         12,  [2],    2],
    4  => ['Resumen de Venta',              null, [3],   2],
    5  => ['Pago a Grupo Pana',             null, [1],   2],
    6  => ['Pago a Toyota',                 null, [3,5], 3],
    7  => ['Facturación',                   null, [5,6], 3],
    8  => ['Documentos Endosados',          10,  [7],    4],
    9  => ['Trámite Aduanero',              12,  [8],    4],
    10 => ['Trámite de Liberación',         30,  [9],    5],
    11 => ['Inmatriculación y Placas',      15,  [10],   5],
    12 => ['Traslado a PDS',                null, [11],  6],
    13 => ['Equipamiento',                  null, [12],  6],
    14 => ['Entrega de Vehículo',           null, [13],  6],
];

const MILESTONES = [
    1 => 'Cotización y Documentación',
    2 => 'Asignación y Pago',
    3 => 'Facturación Oficial',
    4 => 'Trámites Aduaneros',
    5 => 'Liberación y Placas',
    6 => 'Preparación y Entrega',
];

/** Creates a sale with customer/price snapshots and its 14 task rows. */
function createSale(PDO $pdo, int $customerId, int $advisorId, int $versionId, int $colorId, string $temp): int {
    if (!in_array($temp, ['Hot', 'Warm', 'Cold'], true)) throw new Exception('Temperatura inválida');
    $pdo->beginTransaction();
    try {
        $q = $pdo->prepare('SELECT * FROM customers WHERE id=?');
        $q->execute([$customerId]);
        $c = $q->fetch();
        if (!$c) throw new Exception('El cliente no existe');

        $q = $pdo->prepare('SELECT v.*, (SELECT 1 FROM vehicle_colors c WHERE c.id=? AND c.model_id=v.model_id) color_ok
                            FROM vehicle_versions v WHERE v.id=? AND v.active=1');
        $q->execute([$colorId, $versionId]);
        $v = $q->fetch();
        if (!$v) throw new Exception('La versión no existe o está archivada');
        if (!$v['color_ok']) throw new Exception('El color no está disponible para ese modelo');

        $pdo->prepare('INSERT INTO sales (customer_id,advisor_id,version_id,color_id,customer_name_snapshot,
                       customer_doc_type_snapshot,customer_doc_number_snapshot,price_snapshot,temperature)
                       VALUES (?,?,?,?,?,?,?,?,?)')
            ->execute([$customerId, $advisorId, $versionId, $colorId, $c['name'], $c['doc_type'], $c['doc_number'], $v['reference_price'], $temp]);
        $id = (int)$pdo->lastInsertId();
        $ins = $pdo->prepare('INSERT INTO sale_tasks (sale_id, task_no) VALUES (?,?)');
        foreach (array_keys(TASKS) as $n) $ins->execute([$id, $n]);
        $pdo->commit();
        return $id;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

/** Customer-facing milestone state derived from the internal task statuses. */
function milestones(array $tasks): array {
    $out = [];
    foreach (MILESTONES as $k => $name) {
        $ts = array_filter($tasks, fn($t) => $t['milestone'] === $k);
        $done = count(array_filter($ts, fn($t) => $t['status'] === 'completed'));
        $started = count(array_filter($ts, fn($t) => $t['status'] !== 'pending'));
        $out[] = ['n' => $k, 'name' => $name,
                  'state' => $done === count($ts) ? 'completed' : ($started ? 'in_progress' : 'pending')];
    }
    return $out;
}

/** Tasks of a sale enriched with definition data, blocked/overdue flags. */
function saleTasks(int $saleId): array {
    $q = db()->prepare('SELECT * FROM sale_tasks WHERE sale_id=? ORDER BY task_no');
    $q->execute([$saleId]);
    $rows = [];
    foreach ($q->fetchAll() as $r) $rows[(int)$r['task_no']] = $r;
    $now = date('Y-m-d H:i:s');
    $out = [];
    foreach (TASKS as $n => $d) {
        $r = $rows[$n];
        $blocked = false;
        foreach ($d[2] as $dep) if ($rows[$dep]['status'] !== 'completed') $blocked = true;
        $overdue = $r['status'] === 'in_progress' && $r['due_at'] && $r['due_at'] < $now;
        $out[] = [
            'task_no' => $n, 'name' => $d[0], 'days' => $d[1], 'deps' => $d[2], 'milestone' => $d[3],
            'status' => $r['status'], 'started_at' => $r['started_at'], 'due_at' => $r['due_at'],
            'completed_at' => $r['completed_at'], 'notes' => $r['notes'],
            'blocked' => $blocked, 'overdue' => $overdue,
            'overdue_hours' => $overdue ? (int)floor((strtotime($now) - strtotime($r['due_at'])) / 3600) : 0,
        ];
    }
    return $out;
}
