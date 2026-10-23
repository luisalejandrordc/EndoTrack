-- +goose Up
-- Reference data. The Spanish texts are listed in the "spanish-descriptions" document.
-- Banks, customs offices and vehicle categories are enum values (see 0001), not rows.
INSERT INTO
  milestone_definitions (milestone_number, name_es, description_es)
VALUES
  (
    1,
    'Cotización y Documentación',
    'En esta etapa se prepara la cotización oficial de su vehículo y se valida la documentación de identidad de quien firmará la compra.'
  ),
  (
    2,
    'Asignación y Pago',
    'En esta etapa se asigna físicamente su vehículo, identificado por su número de serie y VIN, y se habilita el pago a Grupo Pana.'
  ),
  (
    3,
    'Facturación Oficial',
    'En esta etapa se confirma el pago a Toyota y se emiten las facturas oficiales de su compra.'
  ),
  (
    4,
    'Trámites Aduaneros',
    'En esta etapa se procesan los documentos endosados y su vehículo avanza en el trámite aduanero de nacionalización.'
  ),
  (
    5,
    'Liberación y Placas',
    'En esta etapa se libera su vehículo y se avanza con su inscripción y la asignación de sus placas.'
  ),
  (
    6,
    'Preparación y Entrega',
    'En esta etapa su vehículo pasa a la inspección previa a la entrega, se instalan los accesorios y se coordina la entrega final.'
  );

-- Durations are elapsed calendar hours (3 days = 72 h); intervals are the reminder cadence.
INSERT INTO
  task_definitions (
    task_number,
    name_es,
    description_es,
    milestone_number,
    recommended_duration_hours,
    reminder_interval_hours
  )
VALUES
  (
    1,
    'Cotización del Vehículo',
    'Prepare la cotización oficial. Registre los cuatro montos iniciales en USD (pago a Toyota, comisión de Grupo Pana, accesorios y trámite de liberación); el precio final cotizado se calcula como su suma. Cargue la cotización en PDF (visible para el cliente) y en Excel (interna). El monto a Toyota y la comisión son provisionales y se definen en la tarea 3.',
    1,
    NULL,
    NULL
  ),
  (
    2,
    'Debida Diligencia del Cliente',
    'Reúna la identificación del firmante y la Declaración de Conocimiento del Cliente. Si el cliente es Diplomático, el firmante es el propio cliente; si es una Embajada, entidad religiosa u organismo internacional, es su representante. Registre tipo y número de documento y nombres del firmante, y cargue el documento escaneado y la declaración. Si el cliente no es Diplomático, adjunte también la Vigencia de Poder. Indique la condición PEP y el régimen DDC (datos internos).',
    1,
    72,
    12
  ),
  (
    3,
    'Liquidación de Unidad',
    'Asigne a la unidad su número de serie y su VIN, que no pueden repetirse en otras ventas activas o completadas, y fije el monto final a pagar a Toyota. La comisión final se calcula sola (precio final cotizado menos el monto final a Toyota, los accesorios y el trámite de liberación) y debe ser mayor que cero. Cargue el documento de liquidación de la unidad (interno).',
    2,
    288,
    24
  ),
  (
    4,
    'Pago a Grupo Pana',
    'Verifique el pago del cliente a Grupo Pana: banco, fecha, número de operación (único por banco) y monto depositado, y cargue el voucher. El monto debe coincidir con el precio final cotizado; si difiere, escriba el motivo de la diferencia antes de completar la tarea.',
    2,
    NULL,
    NULL
  ),
  (
    5,
    'Pago a Toyota',
    'Registre el pago interno a Toyota: banco, fecha, número de operación (único por banco) y monto, junto con el voucher y la confirmación de pago. El monto debe coincidir con el monto final a Toyota de la tarea 3; si difiere, escriba el motivo. Toda esta información es interna.',
    3,
    NULL,
    NULL
  ),
  (
    6,
    'Facturación',
    'Registre las cuatro facturas oficiales (Toyota, comisión, accesorios y trámite de liberación) con su número completo (serie y correlativo, por ejemplo F001-000123), fecha, monto y PDF. Cada monto debe coincidir con el valor esperado; si difiere, escriba el motivo. Los números de factura no se pueden repetir.',
    3,
    NULL,
    NULL
  ),
  (
    7,
    'Documentos Endosados',
    'Reciba y cargue los documentos endosados oficiales necesarios para continuar con el trámite aduanero. Esta información es interna.',
    4,
    240,
    24
  ),
  (
    8,
    'Trámite Aduanero',
    'Gestione la nacionalización del vehículo: cargue el Pedido de Depósito, registre el número de DAM (único), la aduana y el canal de control (Verde, Naranja o Rojo), y cargue el certificado aduanero. Toda esta información es interna.',
    4,
    288,
    24
  ),
  (
    9,
    'Trámite de Liberación',
    'Asigne a la persona responsable de la liberación del vehículo y dé seguimiento a este período. Esta información es interna.',
    5,
    720,
    48
  ),
  (
    10,
    'Inmatriculación y Placas',
    'Registre legalmente el vehículo: ingrese la placa definitiva (única, de 6 caracteres), la fecha de inmatriculación y cargue la Tarjeta de Identificación Vehicular Electrónica (TIVe). Estos datos son visibles para el cliente.',
    5,
    360,
    24
  ),
  (
    11,
    'Traslado a PDS',
    'Registre la fecha en que el vehículo se traslada al centro de inspección previa a la entrega (PDS). La fecha es visible para el cliente.',
    6,
    NULL,
    NULL
  ),
  (
    12,
    'Equipamiento',
    'Registre la instalación de accesorios: número de orden de servicio, PDF de la orden y fecha de finalización del equipamiento. Solo la fecha es visible para el cliente; lo demás es interno.',
    6,
    NULL,
    NULL
  ),
  (
    13,
    'Entrega de Vehículo',
    'Coordine la entrega final: registre la fecha de entrega y cargue el acta de entrega firmada; opcionalmente, registre la fecha de traslado a Surquillo (interna). Al completar esta tarea la venta pasa a Completada.',
    6,
    NULL,
    NULL
  );

-- One row per upload slot (19). Customer visibility is fixed by the slot, never set per file.
INSERT INTO
  document_slots (
    slot_code,
    task_number,
    label_es,
    allowed_format,
    is_customer_visible,
    requirement
  )
VALUES
  (
    'quotation_pdf',
    1,
    'Cotización oficial (PDF)',
    'pdf',
    true,
    'always'
  ),
  (
    'quotation_excel',
    1,
    'Cotización oficial (Excel)',
    'excel',
    false,
    'always'
  ),
  (
    'signer_identity_scan',
    2,
    'Documento de identidad del firmante (escaneado)',
    'pdf',
    true,
    'always'
  ),
  (
    'customer_knowledge_affidavit',
    2,
    'Declaración de Conocimiento del Cliente',
    'pdf',
    true,
    'always'
  ),
  (
    'power_of_attorney',
    2,
    'Vigencia de Poder',
    'pdf',
    true,
    'conditional'
  ),
  (
    'unit_settlement',
    3,
    'Documento de liquidación de la unidad',
    'pdf',
    false,
    'always'
  ),
  (
    'pana_payment_voucher',
    4,
    'Voucher de pago a Grupo Pana',
    'pdf',
    true,
    'always'
  ),
  (
    'toyota_payment_voucher',
    5,
    'Voucher de pago a Toyota',
    'pdf',
    false,
    'always'
  ),
  (
    'toyota_payment_confirmation',
    5,
    'Confirmación de pago a Toyota',
    'pdf',
    false,
    'always'
  ),
  (
    'invoice_toyota',
    6,
    'Factura de Toyota',
    'pdf',
    true,
    'always'
  ),
  (
    'invoice_commission',
    6,
    'Factura de comisión',
    'pdf',
    true,
    'always'
  ),
  (
    'invoice_accessories',
    6,
    'Factura de accesorios',
    'pdf',
    true,
    'always'
  ),
  (
    'invoice_release_processing',
    6,
    'Factura de trámite de liberación',
    'pdf',
    true,
    'always'
  ),
  (
    'endorsed_documents',
    7,
    'Documentos endosados',
    'pdf',
    false,
    'always'
  ),
  (
    'deposit_order',
    8,
    'Pedido de Depósito',
    'pdf',
    false,
    'always'
  ),
  (
    'customs_certificate',
    8,
    'Certificado aduanero',
    'pdf',
    false,
    'always'
  ),
  (
    'tive_document',
    10,
    'Tarjeta de Identificación Vehicular Electrónica (TIVe)',
    'pdf',
    true,
    'always'
  ),
  (
    'service_order',
    12,
    'Orden de servicio',
    'pdf',
    false,
    'always'
  ),
  (
    'signed_delivery_record',
    13,
    'Acta de entrega firmada',
    'pdf',
    true,
    'always'
  );
