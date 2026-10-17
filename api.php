<?php
require __DIR__ . '/lib.php';
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax']);
session_start();
header('Content-Type: application/json; charset=utf-8');

$in = json_decode(file_get_contents('php://input'), true) ?: [];
$action = $_GET['action'] ?? '';

function out($d, int $code = 200) { http_response_code($code); echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }
function fail(string $m, int $code = 400) { out(['error' => $m], $code); }
function user() { return $_SESSION['u'] ?? null; }
function needEmp() { $u = user(); if (!$u || $u['type'] !== 'employee') fail('No autenticado', 401); return $u; }
function needCust() { $u = user(); if (!$u || $u['type'] !== 'customer') fail('No autenticado', 401); return $u; }
function isMgr(array $u): bool { return in_array($u['role'], ['System Admin', 'Sales Manager'], true); }
function canSee(array $u, array $sale): bool { return isMgr($u) || (int)$sale['advisor_id'] === (int)$u['id']; }

function logAccess(string $type, string $dt, string $dn, ?int $uid, string $act): void {
    db()->prepare('INSERT INTO access_logs (user_type,document_type,document_number,user_id,action_type,ip_address) VALUES (?,?,?,?,?,?)')
        ->execute([$type, $dt, $dn, $uid, $act, $_SERVER['REMOTE_ADDR'] ?? null]);
}
function audit(int $saleId, int $uid, string $action, string $detail): void {
    db()->prepare('INSERT INTO audit_log (sale_id,user_id,action,detail) VALUES (?,?,?,?)')->execute([$saleId, $uid, $action, $detail]);
}
function saleRow(int $id) {
    $q = db()->prepare("SELECT s.*, m.name model, m.category, v.name version, col.name color,
            CONCAT(e.first_name,' ',e.last_name) advisor_name, e.email advisor_email, e.phone advisor_phone
        FROM sales s
        JOIN vehicle_versions v ON v.id=s.version_id
        JOIN vehicle_models m ON m.id=v.model_id
        JOIN vehicle_colors col ON col.id=s.color_id
        JOIN employees e ON e.id=s.advisor_id
        WHERE s.id=?");
    $q->execute([$id]);
    return $q->fetch();
}
/** Recomputes automatic completion: all 14 tasks completed => completed, otherwise active. */
function recalcSale(int $saleId): void {
    $pdo = db();
    $n = $pdo->prepare("SELECT COUNT(*) FROM sale_tasks WHERE sale_id=? AND status='completed'");
    $n->execute([$saleId]);
    $status = ((int)$n->fetchColumn() === count(TASKS)) ? 'completed' : 'active';
    $pdo->prepare("UPDATE sales SET status=? WHERE id=? AND status IN ('active','completed')")->execute([$status, $saleId]);
}
function customerAllowed(array $u, int $cid): bool {
    if (isMgr($u)) return true;
    $q = db()->prepare('SELECT 1 FROM customers c WHERE c.id=? AND (c.created_by=? OR EXISTS (SELECT 1 FROM sales s WHERE s.customer_id=c.id AND s.advisor_id=?))');
    $q->execute([$cid, $u['id'], $u['id']]);
    return (bool)$q->fetchColumn();
}

const DOC_PATTERNS = [
    'DNI' => '/^\d{8}$/', 'RUC' => '/^\d{11}$/',
    'CE' => '/^[A-Za-z0-9]{9,12}$/', 'PAS' => '/^[A-Za-z0-9]{6,12}$/', 'CDI' => '/^[A-Za-z0-9]{6,15}$/',
];

try {
    $pdo = db();
    switch ($action) {

    // ---------- Authentication ----------
    case 'login':
        $portal = !empty($in['portal']);
        $type = $portal ? 'Customer' : 'Employee';
        $dt = strtoupper(trim($in['doc_type'] ?? ''));
        $dn = trim($in['doc_number'] ?? '');
        $pw = (string)($in['password'] ?? '');
        $allowed = $portal ? ['DNI', 'CE', 'RUC', 'PAS', 'CDI'] : ['DNI', 'CE', 'PAS'];
        if (!in_array($dt, $allowed, true) || !preg_match(DOC_PATTERNS[$dt], $dn)) fail('Documento inválido');

        $q = $pdo->prepare("SELECT COUNT(*) FROM access_logs WHERE user_type=? AND document_type=? AND document_number=?
                            AND action_type='LOGIN_FAILED' AND created_at > (NOW() - INTERVAL 15 MINUTE)");
        $q->execute([$type, $dt, $dn]);
        if ((int)$q->fetchColumn() >= 5) fail('Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.', 429);

        $q = $pdo->prepare($portal
            ? 'SELECT * FROM customers WHERE doc_type=? AND doc_number=?'
            : 'SELECT * FROM employees WHERE doc_type=? AND doc_number=? AND active=1');
        $q->execute([$dt, $dn]);
        $r = $q->fetch();
        if (!$r || !password_verify($pw, $r['password_hash'])) {
            logAccess($type, $dt, $dn, $r ? (int)$r['id'] : null, 'LOGIN_FAILED');
            fail('Documento o contraseña incorrectos', 401);
        }
        session_regenerate_id(true);
        $_SESSION['u'] = $portal
            ? ['type' => 'customer', 'id' => (int)$r['id'], 'name' => $r['name'], 'doc_type' => $dt, 'doc_number' => $dn]
            : ['type' => 'employee', 'id' => (int)$r['id'], 'name' => $r['first_name'] . ' ' . $r['last_name'], 'role' => $r['role'], 'doc_type' => $dt, 'doc_number' => $dn];
        logAccess($type, $dt, $dn, (int)$r['id'], 'LOGIN_SUCCESS');
        out(['ok' => true, 'user' => $_SESSION['u']]);

    case 'me':
        out(['user' => user()]);

    case 'logout':
        if ($u = user()) logAccess($u['type'] === 'customer' ? 'Customer' : 'Employee', $u['doc_type'], $u['doc_number'], $u['id'], 'LOGOUT');
        session_destroy();
        out(['ok' => true]);

    // ---------- Reference data ----------
    case 'catalog':
        needEmp();
        $models = $pdo->query('SELECT * FROM vehicle_models ORDER BY name')->fetchAll();
        $vq = $pdo->prepare('SELECT id,name,reference_price FROM vehicle_versions WHERE model_id=? AND active=1 ORDER BY reference_price');
        $cq = $pdo->prepare('SELECT id,name FROM vehicle_colors WHERE model_id=? ORDER BY name');
        foreach ($models as &$m) {
            $vq->execute([$m['id']]); $m['versions'] = $vq->fetchAll();
            $cq->execute([$m['id']]); $m['colors'] = $cq->fetchAll();
        }
        out(['models' => $models]);

    case 'advisors':
        $u = needEmp();
        if (!isMgr($u)) fail('Sin permiso', 403);
        out(['advisors' => $pdo->query("SELECT id, CONCAT(first_name,' ',last_name) name FROM employees WHERE role='Sales Advisor' AND active=1 ORDER BY first_name")->fetchAll()]);

    // ---------- Customers ----------
    case 'customers':
        $u = needEmp();
        if (isMgr($u)) {
            $rows = $pdo->query('SELECT id,type,doc_type,doc_number,name,nationality,email,phone FROM customers ORDER BY name')->fetchAll();
        } else {
            $q = $pdo->prepare('SELECT id,type,doc_type,doc_number,name,nationality,email,phone FROM customers c
                WHERE c.created_by=? OR EXISTS (SELECT 1 FROM sales s WHERE s.customer_id=c.id AND s.advisor_id=?) ORDER BY name');
            $q->execute([$u['id'], $u['id']]);
            $rows = $q->fetchAll();
        }
        out(['customers' => $rows]);

    case 'customer_create':
        $u = needEmp();
        $types = ['Diplomático', 'Embajada', 'Entidad religiosa católica', 'Entidad religiosa no católica', 'Organismo internacional'];
        $type = $in['type'] ?? '';
        $dt = strtoupper(trim($in['doc_type'] ?? ''));
        $dn = trim($in['doc_number'] ?? '');
        $name = trim($in['name'] ?? '');
        $email = trim($in['email'] ?? '');
        if (!in_array($type, $types, true)) fail('Tipo de cliente inválido');
        $b2c = $type === 'Diplomático';
        if ($b2c && !in_array($dt, ['DNI', 'CE', 'PAS', 'CDI'], true)) fail('Un cliente diplomático usa DNI, CE, PAS o CDI');
        if (!$b2c && $dt !== 'RUC') fail('Las entidades (B2B) se identifican con RUC');
        if (!preg_match(DOC_PATTERNS[$dt], $dn)) fail("Formato inválido para $dt");
        if ($name === '') fail('El nombre / razón social es obligatorio');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Correo inválido');
        $temp = bin2hex(random_bytes(4));
        try {
            $pdo->prepare('INSERT INTO customers (type,doc_type,doc_number,name,nationality,contact_person,email,phone,password_hash,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)')
                ->execute([$type, $dt, $dn, $name, trim($in['nationality'] ?? ''), trim($in['contact_person'] ?? '') ?: null, $email, trim($in['phone'] ?? ''), password_hash($temp, PASSWORD_DEFAULT), $u['id']]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') fail('Ya existe un cliente con ese tipo y número de documento');
            throw $e;
        }
        // In production this would be emailed as an activation link; shown here for the demo only.
        out(['ok' => true, 'id' => (int)$pdo->lastInsertId(), 'temp_password' => $temp]);

    // ---------- Sales ----------
    case 'sales':
        $u = needEmp();
        $sql = "SELECT s.id, s.status, s.temperature, s.created_at, s.customer_name_snapshot cname, s.customer_doc_number_snapshot cdoc,
                    s.price_snapshot, m.name model, v.name version, col.name color,
                    CONCAT(e.first_name,' ',e.last_name) advisor,
                    (SELECT COUNT(*) FROM sale_tasks t WHERE t.sale_id=s.id AND t.status='completed') done,
                    (SELECT MIN(task_no) FROM sale_tasks t WHERE t.sale_id=s.id AND t.status<>'completed') current_task
                FROM sales s
                JOIN vehicle_versions v ON v.id=s.version_id JOIN vehicle_models m ON m.id=v.model_id
                JOIN vehicle_colors col ON col.id=s.color_id JOIN employees e ON e.id=s.advisor_id WHERE 1=1";
        $p = [];
        if (!isMgr($u)) { $sql .= ' AND s.advisor_id=?'; $p[] = $u['id']; }
        if (in_array($_GET['status'] ?? '', ['active', 'completed', 'cancelled'], true)) { $sql .= ' AND s.status=?'; $p[] = $_GET['status']; }
        if (($qs = trim($_GET['q'] ?? '')) !== '') {
            $sql .= ' AND (s.customer_name_snapshot LIKE ? OR s.customer_doc_number_snapshot LIKE ? OR m.name LIKE ?)';
            $like = "%$qs%"; array_push($p, $like, $like, $like);
        }
        $q = $pdo->prepare($sql . ' ORDER BY s.id DESC LIMIT 200');
        $q->execute($p);
        out(['sales' => $q->fetchAll()]);

    case 'sale_create':
        $u = needEmp();
        $cid = (int)($in['customer_id'] ?? 0);
        if (!customerAllowed($u, $cid)) fail('Cliente no disponible', 403);
        $advisor = isMgr($u) ? (int)($in['advisor_id'] ?? 0) : (int)$u['id'];
        if (!$advisor) fail('Selecciona un asesor');
        $id = createSale($pdo, $cid, $advisor, (int)($in['version_id'] ?? 0), (int)($in['color_id'] ?? 0), $in['temperature'] ?? 'Warm');
        audit($id, $u['id'], 'SALE_CREATED', 'Venta registrada');
        out(['ok' => true, 'id' => $id]);

    case 'sale':
        $u = needEmp();
        $s = saleRow((int)($_GET['id'] ?? 0));
        if (!$s) fail('Venta no encontrada', 404);
        if (!canSee($u, $s)) fail('Sin acceso a esta venta', 403);
        $tasks = saleTasks((int)$s['id']);
        $q = $pdo->prepare("SELECT a.action, a.detail, a.created_at, CONCAT(e.first_name,' ',e.last_name) who
                            FROM audit_log a JOIN employees e ON e.id=a.user_id WHERE a.sale_id=? ORDER BY a.id DESC LIMIT 25");
        $q->execute([$s['id']]);
        out(['sale' => $s, 'tasks' => $tasks, 'milestones' => milestones($tasks), 'audit' => $q->fetchAll(),
             'can_override' => isMgr($u)]);

    case 'task_set':
        $u = needEmp();
        $sid = (int)($in['sale_id'] ?? 0); $n = (int)($in['task_no'] ?? 0); $to = $in['to'] ?? '';
        $s = saleRow($sid);
        if (!$s) fail('Venta no encontrada', 404);
        if (!canSee($u, $s)) fail('Sin acceso a esta venta', 403);
        if ($s['status'] === 'cancelled') fail('La venta está cancelada');
        if (!isset(TASKS[$n])) fail('Tarea inválida');
        $tasks = array_column(saleTasks($sid), null, 'task_no');
        $t = $tasks[$n];
        $now = date('Y-m-d H:i:s');

        if ($t['status'] === 'pending' && $to === 'in_progress') {
            if ($t['blocked']) fail('Hay tareas previas sin completar');
            $due = TASKS[$n][1] ? date('Y-m-d H:i:s', strtotime('+' . TASKS[$n][1] . ' days')) : null; // strict elapsed calendar time
            $pdo->prepare("UPDATE sale_tasks SET status='in_progress', started_at=?, due_at=? WHERE sale_id=? AND task_no=?")->execute([$now, $due, $sid, $n]);
        } elseif ($t['status'] === 'in_progress' && $to === 'completed') {
            $pdo->prepare("UPDATE sale_tasks SET status='completed', completed_at=? WHERE sale_id=? AND task_no=?")->execute([$now, $sid, $n]);
        } elseif ($t['status'] === 'completed' && $to === 'in_progress') {
            if (!isMgr($u)) fail('Solo un Gerente de Ventas o Admin puede reabrir una tarea completada', 403);
            foreach ($tasks as $other) {
                if (in_array($n, $other['deps'], true) && $other['status'] !== 'pending') fail("Primero reabre la tarea {$other['task_no']}, que depende de esta");
            }
            $pdo->prepare("UPDATE sale_tasks SET status='in_progress', completed_at=NULL WHERE sale_id=? AND task_no=?")->execute([$sid, $n]);
        } else {
            fail('Transición no permitida');
        }
        audit($sid, $u['id'], 'TASK_STATUS', "Tarea $n: {$t['status']} → $to");
        recalcSale($sid);
        out(['ok' => true]);

    case 'task_notes':
        $u = needEmp();
        $sid = (int)($in['sale_id'] ?? 0); $n = (int)($in['task_no'] ?? 0);
        $s = saleRow($sid);
        if (!$s) fail('Venta no encontrada', 404);
        if (!canSee($u, $s)) fail('Sin acceso', 403);
        $tasks = array_column(saleTasks($sid), null, 'task_no');
        if (!isset($tasks[$n])) fail('Tarea inválida');
        if ($tasks[$n]['status'] === 'completed' && !isMgr($u)) fail('Las tareas completadas son de solo lectura', 403);
        $pdo->prepare('UPDATE sale_tasks SET notes=? WHERE sale_id=? AND task_no=?')->execute([mb_substr(trim($in['notes'] ?? ''), 0, 2000) ?: null, $sid, $n]);
        audit($sid, $u['id'], 'TASK_NOTE', "Notas actualizadas en tarea $n");
        out(['ok' => true]);

    case 'sale_cancel':
        $u = needEmp();
        $sid = (int)($in['sale_id'] ?? 0);
        $reason = trim($in['reason'] ?? '');
        $s = saleRow($sid);
        if (!$s) fail('Venta no encontrada', 404);
        if (!canSee($u, $s)) fail('Sin acceso', 403);
        if ($reason === '') fail('El motivo de cancelación es obligatorio');
        if ($s['status'] !== 'active') fail('Solo se pueden cancelar ventas activas');
        $pdo->prepare("UPDATE sales SET status='cancelled', cancel_reason=? WHERE id=?")->execute([mb_substr($reason, 0, 255), $sid]);
        audit($sid, $u['id'], 'SALE_CANCELLED', mb_substr($reason, 0, 200));
        out(['ok' => true]);

    case 'sale_reopen':
        $u = needEmp();
        if (!isMgr($u)) fail('Solo un Gerente de Ventas o Admin puede deshacer una cancelación', 403);
        $sid = (int)($in['sale_id'] ?? 0);
        $s = saleRow($sid);
        if (!$s || $s['status'] !== 'cancelled') fail('La venta no está cancelada');
        $pdo->prepare("UPDATE sales SET status='active', cancel_reason=NULL WHERE id=?")->execute([$sid]);
        recalcSale($sid);
        audit($sid, $u['id'], 'SALE_REOPENED', 'Cancelación deshecha');
        out(['ok' => true]);

    case 'sale_reassign':
        $u = needEmp();
        if (!isMgr($u)) fail('Sin permiso', 403);
        $sid = (int)($in['sale_id'] ?? 0); $aid = (int)($in['advisor_id'] ?? 0);
        $q = $pdo->prepare("SELECT 1 FROM employees WHERE id=? AND role='Sales Advisor' AND active=1");
        $q->execute([$aid]);
        if (!$q->fetchColumn()) fail('Asesor inválido');
        $pdo->prepare('UPDATE sales SET advisor_id=? WHERE id=?')->execute([$aid, $sid]);
        audit($sid, $u['id'], 'SALE_REASSIGNED', "Asesor reasignado a #$aid");
        out(['ok' => true]);

    // ---------- Dashboard ----------
    case 'dashboard':
        $u = needEmp();
        $scope = isMgr($u) ? '' : ' AND s.advisor_id=' . (int)$u['id'];
        $by = [];
        foreach ($pdo->query("SELECT s.status, COUNT(*) c FROM sales s WHERE 1=1 $scope GROUP BY s.status")->fetchAll() as $r) $by[$r['status']] = (int)$r['c'];

        // current milestone of each active sale = milestone of its first non-completed task
        $ms = array_fill(1, 6, 0);
        $rows = $pdo->query("SELECT MIN(t.task_no) n FROM sales s JOIN sale_tasks t ON t.sale_id=s.id
                             WHERE s.status='active' AND t.status<>'completed' $scope GROUP BY s.id")->fetchAll();
        foreach ($rows as $r) $ms[TASKS[(int)$r['n']][3]]++;

        $q = $pdo->prepare("SELECT s.id sale_id, s.customer_name_snapshot cname, t.task_no, t.due_at,
                TIMESTAMPDIFF(HOUR, t.due_at, ?) hours_over
            FROM sale_tasks t JOIN sales s ON s.id=t.sale_id
            WHERE s.status='active' AND t.status='in_progress' AND t.due_at IS NOT NULL AND t.due_at < ? $scope
            ORDER BY t.due_at LIMIT 15");
        $nowS = date('Y-m-d H:i:s');
        $q->execute([$nowS, $nowS]);
        $overdue = $q->fetchAll();
        foreach ($overdue as &$o) {
            $o['task_name'] = TASKS[(int)$o['task_no']][0];
            $o['level'] = $o['hours_over'] >= 48 ? 3 : ($o['hours_over'] >= 24 ? 2 : 1);
        }
        unset($o);

        $res = ['by_status' => $by, 'milestones' => $ms, 'milestone_names' => array_values(MILESTONES), 'overdue' => $overdue];
        $res['top_models'] = $pdo->query("SELECT m.name, COUNT(*) c FROM sales s JOIN vehicle_versions v ON v.id=s.version_id JOIN vehicle_models m ON m.id=v.model_id WHERE 1=1 $scope GROUP BY m.id ORDER BY c DESC LIMIT 5")->fetchAll();
        if (isMgr($u)) {
            $res['workload'] = $pdo->query("SELECT CONCAT(e.first_name,' ',e.last_name) name, COUNT(s.id) c FROM employees e
                LEFT JOIN sales s ON s.advisor_id=e.id AND s.status='active' WHERE e.role='Sales Advisor' AND e.active=1 GROUP BY e.id ORDER BY c DESC")->fetchAll();
        }
        out($res);

    // ---------- Customer portal ----------
    case 'portal_sales':
        $u = needCust();
        $q = $pdo->prepare('SELECT id FROM sales WHERE customer_id=? ORDER BY id DESC');
        $q->execute([$u['id']]);
        $list = [];
        foreach ($q->fetchAll() as $r) {
            $s = saleRow((int)$r['id']);
            $list[] = [ // only customer-safe fields are returned
                'id' => (int)$s['id'], 'status' => $s['status'], 'created_at' => $s['created_at'],
                'model' => $s['model'], 'version' => $s['version'], 'category' => $s['category'], 'color' => $s['color'],
                'price_snapshot' => $s['price_snapshot'],
                'advisor_name' => $s['advisor_name'], 'advisor_email' => $s['advisor_email'], 'advisor_phone' => $s['advisor_phone'],
                'milestones' => milestones(saleTasks((int)$s['id'])),
            ];
        }
        out(['customer' => $u['name'], 'sales' => $list]);

    default:
        fail('Acción desconocida', 404);
    }
} catch (Throwable $e) {
    fail('Error del servidor: ' . $e->getMessage(), 500);
}
