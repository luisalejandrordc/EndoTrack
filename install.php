<?php
// Run once from the browser: http://localhost/endoso-mvp/install.php
// Creates the database, tables and demo data. Delete this file afterwards.
require __DIR__ . '/lib.php';
header('Content-Type: text/plain; charset=utf-8');

try {
    $root = new PDO('mysql:host=' . DB_HOST . ';charset=utf8mb4', DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $root->exec('CREATE DATABASE IF NOT EXISTS `' . DB_NAME . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');

    $pdo = db();
    foreach (array_filter(array_map('trim', explode(';', file_get_contents(__DIR__ . '/schema.sql')))) as $stmt) {
        $pdo->exec($stmt);
    }
    echo "Tablas creadas.\n";

    if ((int)$pdo->query('SELECT COUNT(*) FROM employees')->fetchColumn() > 0) {
        exit("Ya existen datos de demostración; no se vuelve a sembrar.\n");
    }

    $h = fn($p) => password_hash($p, PASSWORD_DEFAULT);

    $e = $pdo->prepare('INSERT INTO employees (doc_type,doc_number,first_name,last_name,role,email,phone,password_hash) VALUES (?,?,?,?,?,?,?,?)');
    $e->execute(['DNI', '00000001', 'Ana',   'Rojas',   'System Admin',  'admin@grupopana.test',   '999000001', $h('admin123')]);
    $e->execute(['DNI', '00000002', 'Luis',  'Paredes', 'Sales Manager', 'gerente@grupopana.test', '999000002', $h('gerente123')]);
    $e->execute(['DNI', '00000003', 'María', 'Torres',  'Sales Advisor', 'maria@grupopana.test',   '999000003', $h('asesor123')]);
    $e->execute(['DNI', '00000004', 'Jorge', 'Salas',   'Sales Advisor', 'jorge@grupopana.test',   '999000004', $h('asesor123')]);

    $c = $pdo->prepare('INSERT INTO customers (type,doc_type,doc_number,name,nationality,contact_person,email,phone,password_hash,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)');
    $c->execute(['Diplomático', 'CE', '001234567', 'Carlos Mendoza', 'Colombia', null, 'carlos@example.test', '987000111', $h('cliente123'), 3]);
    $c->execute(['Embajada', 'RUC', '20123456789', 'Embajada de Japón', 'Japón', 'Yuki Tanaka', 'consular@japon.example.test', '987000222', $h('cliente123'), 3]);
    $c->execute(['Organismo internacional', 'RUC', '20987654321', 'Organización Internacional Andina', 'Perú', 'Rosa Quispe', 'rosa@oia.example.test', '987000333', $h('cliente123'), 4]);

    // Catalog
    $models = [
        ['Hilux',       'Camioneta', [['DX 4x4 MT', 38500], ['SRV 4x4 AT', 52900]], ['Blanco Súper', 'Gris Metálico', 'Negro']],
        ['Yaris Cross', 'Familiar',  [['XLS', 27800], ['HEV', 33400]],              ['Blanco Perlado', 'Rojo', 'Azul Oscuro']],
        ['Hino 300',    'Comercial', [['Cabina Simple', 31200]],                    ['Blanco']],
    ];
    $m = $pdo->prepare('INSERT INTO vehicle_models (name,category) VALUES (?,?)');
    $v = $pdo->prepare('INSERT INTO vehicle_versions (model_id,name,reference_price) VALUES (?,?,?)');
    $col = $pdo->prepare('INSERT INTO vehicle_colors (model_id,name) VALUES (?,?)');
    foreach ($models as [$name, $cat, $versions, $colors]) {
        $m->execute([$name, $cat]);
        $mid = (int)$pdo->lastInsertId();
        foreach ($versions as [$vn, $price]) $v->execute([$mid, $vn, $price]);
        foreach ($colors as $cn) $col->execute([$mid, $cn]);
    }

    // Demo sales
    $s1 = createSale($pdo, 1, 3, 2, 1, 'Hot');   // Hilux SRV, Carlos, advisor María
    $s2 = createSale($pdo, 2, 3, 3, 4, 'Warm');  // Yaris Cross XLS, Embajada
    $s3 = createSale($pdo, 3, 4, 5, 7, 'Cold');  // Hino 300, advisor Jorge

    $done = $pdo->prepare("UPDATE sale_tasks SET status='completed', started_at=?, completed_at=? WHERE sale_id=? AND task_no=?");
    $prog = $pdo->prepare("UPDATE sale_tasks SET status='in_progress', started_at=?, due_at=? WHERE sale_id=? AND task_no=?");
    $d = fn($s) => date('Y-m-d H:i:s', strtotime($s));
    // Sale 1: tasks 1-2 done, task 3 started 14 days ago (12-day target => overdue)
    $done->execute([$d('-20 days'), $d('-18 days'), $s1, 1]);
    $done->execute([$d('-18 days'), $d('-15 days'), $s1, 2]);
    $prog->execute([$d('-14 days'), $d('-2 days'), $s1, 3]);
    // Sale 2: task 1 in progress
    $prog->execute([$d('-1 day'), null, $s2, 1]);

    echo "Datos de demostración creados.\n\nUsuarios (tipo doc / número / contraseña):\n";
    echo "  Admin:    DNI 00000001 / admin123\n  Gerente:  DNI 00000002 / gerente123\n";
    echo "  Asesora:  DNI 00000003 / asesor123\n  Asesor:   DNI 00000004 / asesor123\n";
    echo "  Cliente:  CE 001234567 / cliente123  (portal.html)\n  Cliente:  RUC 20123456789 / cliente123\n";
    echo "\nElimina install.php cuando termines.\n";
} catch (Throwable $ex) {
    http_response_code(500);
    echo 'Error: ' . $ex->getMessage() . "\nRevisa config.php (usuario/contraseña de MySQL).\n";
}
