import type { Dispatch, SetStateAction } from "react";
import type { Toast } from "../../../shared/ui/toast";
import { Icon } from "../../../shared/ui/Icon";

export function DocumentsTab({
  documentStatuses,
  setDocumentStatuses,
  toast,
}: {
  documentStatuses: Record<string, string>;
  setDocumentStatuses: Dispatch<SetStateAction<Record<string, string>>>;
  toast: (toast: Toast) => void;
}) {
  return (
    <div className="documents-tab">
      <div className="subsection-heading">
        <div>
          <h3>Documentos de la operación</h3>
          <p>Archivos asociados a cada etapa del proceso.</p>
        </div>
        <button
          className="button button-secondary button-sm"
          onClick={() =>
            toast({
              title: "Descarga preparada",
              message:
                "En modo demo, los documentos son representaciones visuales.",
              tone: "info",
            })
          }
        >
          <Icon name="download" size={15} /> Descargar lista
        </button>
      </div>
      <div className="document-groups">
        {[
          {
            task: "Tarea 1 · Cotización",
            items: ["Cotización PDF", "Cotización Excel"],
          },
          {
            task: "Tarea 2 · Cliente",
            items: [
              "Escaneo de documento de identidad",
              "Declaración jurada de conocimiento del cliente",
              "Poder de representación",
            ],
          },
          { task: "Tarea 4 · Pago", items: ["Constancia de abono"] },
          { task: "Tarea 10 · Inscripción", items: ["TIVe"] },
        ].map((group) => (
          <div className="document-group" key={group.task}>
            <h4>{group.task}</h4>
            {group.items.map((name) => (
              <div className="document-row" key={name}>
                <span
                  className={`document-icon ${documentStatuses[name] === "Cargado" ? "uploaded" : ""}`}
                >
                  <Icon
                    name={
                      name.toLowerCase().includes("excel")
                        ? "file-text"
                        : "file-check"
                    }
                    size={17}
                  />
                </span>
                <div className="document-copy">
                  <strong>{name}</strong>
                  <span>
                    {name.toLowerCase().includes("excel")
                      ? "Excel · Interno"
                      : "PDF · Visible para el cliente"}
                  </span>
                </div>
                <span
                  className={`document-state ${documentStatuses[name] === "Cargado" ? "uploaded" : ""}`}
                >
                  <i />
                  {documentStatuses[name] || "Pendiente"}
                </span>
                <label
                  className="icon-button document-upload"
                  title="Adjuntar o reemplazar archivo"
                >
                  <Icon name="upload" size={16} />
                  <input
                    type="file"
                    accept=".pdf,.xls,.xlsx"
                    hidden
                    onChange={(event) => {
                      if (event.target.files?.[0]) {
                        setDocumentStatuses((old) => ({
                          ...old,
                          [name]: "Cargado",
                        }));
                        toast({
                          title: "Documento adjuntado",
                          message: event.target.files[0].name,
                          tone: "success",
                        });
                      }
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="muted-caption">
        <Icon name="shield-check" size={15} /> Los documentos internos no serán
        visibles para el cliente en la Fase 2.
      </p>
    </div>
  );
}
