import { useEffect, useState } from "react";
import type { Role, Sale } from "../../shared/types";
import { Icon } from "../../shared/ui/Icon";
import type { Toast } from "../../shared/ui/toast";
import { MilestoneStrip } from "./components/MilestoneStrip";
import { DocumentsTab } from "./detail/DocumentsTab";
import { HistoryTab } from "./detail/HistoryTab";
import { NotesTab } from "./detail/NotesTab";
import { SaleHero } from "./detail/SaleHero";
import { SummaryTab } from "./detail/SummaryTab";
import { TasksTab } from "./detail/TasksTab";
import type { ModalAction } from "./types";

type DetailTab = "Resumen" | "Tareas" | "Documentos" | "Notas" | "Historial";
const DETAIL_TABS: readonly DetailTab[] = [
  "Resumen",
  "Tareas",
  "Documentos",
  "Notas",
  "Historial",
];

export function SaleDetail({
  sale,
  role,
  onBack,
  onTaskAction,
  onSaleAction,
  onSaveNotes,
  toast,
}: {
  sale: Sale;
  role: Role;
  onBack: () => void;
  onTaskAction: (action: ModalAction, taskNumber: number) => void;
  onSaleAction: (action: ModalAction) => void;
  onSaveNotes: (notes: string) => void;
  toast: (toast: Toast) => void;
}) {
  const [tab, setTab] = useState<DetailTab>("Resumen");
  const current =
    sale.tasks.find((task) => task.status === "in_progress") ||
    sale.tasks.find((task) => task.status === "eligible") ||
    sale.tasks.find((task) => task.status !== "completed");
  const [selectedTask, setSelectedTask] = useState(current?.number || 1);
  const [notesDraft, setNotesDraft] = useState(sale.notes);
  // Demo-only upload statuses; they live here so they survive tab switches.
  const [documentStatuses, setDocumentStatuses] = useState<
    Record<string, string>
  >({
    "Cotización PDF": "Cargado",
    "Escaneo de documento de identidad": "Cargado",
    "Declaración jurada de conocimiento del cliente": "Pendiente",
    "Constancia de abono": "Pendiente",
    TIVe: "Pendiente",
  });
  const canManage = role !== "sales_advisor";
  const activeTask = sale.state === "active" ? current : undefined;

  useEffect(() => {
    setSelectedTask(current?.number || 1);
    setNotesDraft(sale.notes);
    setTab("Resumen");
  }, [sale.id]);

  function openTasks(taskNumber?: number) {
    if (taskNumber !== undefined) setSelectedTask(taskNumber);
    setTab("Tareas");
  }

  return (
    <div className="page-stack sale-detail-page">
      <div className="detail-back-row">
        <button className="back-link" onClick={onBack}>
          <Icon name="arrow-left" size={16} /> Volver a ventas
        </button>
        <span className="detail-separator">/</span>
        <span>{sale.code}</span>
      </div>
      {sale.state === "cancelled" && (
        <div className="sale-alert sale-alert-red">
          <Icon name="alert" size={18} />
          <div>
            <strong>Esta operación está cancelada</strong>
            <span>
              Las tareas están en modo lectura. La razón registrada es visible
              solo para el equipo interno.
            </span>
          </div>
          {canManage && (
            <button
              className="button button-secondary button-sm"
              onClick={() => onSaleAction("reopen-sale")}
            >
              Reabrir venta
            </button>
          )}
        </div>
      )}
      {sale.state === "completed" && (
        <div className="sale-alert sale-alert-green">
          <Icon name="check-circle" size={18} />
          <div>
            <strong>¡Operación completada!</strong>
            <span>
              La venta alcanzó el cierre de las 13 tareas del proceso.
            </span>
          </div>
        </div>
      )}
      <SaleHero
        sale={sale}
        canManage={canManage}
        activeTask={activeTask}
        onSaleAction={onSaleAction}
      />
      <MilestoneStrip sale={sale} />
      <section className="workspace-card sale-detail-content">
        <div className="detail-tabs" role="tablist">
          {DETAIL_TABS.map((item) => (
            <button
              key={item}
              role="tab"
              aria-selected={tab === item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
            >
              {item === "Tareas" && <Icon name="list" size={16} />}
              {item === "Documentos" && <Icon name="file-text" size={16} />}
              {item === "Notas" && <Icon name="message" size={16} />}
              {item === "Historial" && <Icon name="history" size={16} />}
              {item}
              {item === "Tareas" && <span className="tab-count">13</span>}
            </button>
          ))}
        </div>
        {tab === "Resumen" && (
          <SummaryTab
            sale={sale}
            activeTask={activeTask}
            onOpenTask={openTasks}
            onTaskAction={onTaskAction}
            toast={toast}
          />
        )}
        {tab === "Tareas" && (
          <TasksTab
            sale={sale}
            selectedTask={selectedTask}
            onSelectTask={setSelectedTask}
            canManage={canManage}
            onTaskAction={onTaskAction}
            toast={toast}
          />
        )}
        {tab === "Documentos" && (
          <DocumentsTab
            documentStatuses={documentStatuses}
            setDocumentStatuses={setDocumentStatuses}
            toast={toast}
          />
        )}
        {tab === "Notas" && (
          <NotesTab
            sale={sale}
            notesDraft={notesDraft}
            setNotesDraft={setNotesDraft}
            onSaveNotes={onSaveNotes}
            toast={toast}
          />
        )}
        {tab === "Historial" && (
          <HistoryTab sale={sale} activeTask={activeTask} toast={toast} />
        )}
      </section>
    </div>
  );
}
