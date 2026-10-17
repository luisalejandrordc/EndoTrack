<?php
// Edit these values to match your MySQL server (XAMPP defaults shown).
const DB_HOST = 'localhost';
const DB_NAME = 'endoso_mvp';
const DB_USER = 'luisalejandrordc';
const DB_PASS = '***REMOVED***';

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
    }
    return $pdo;
}
