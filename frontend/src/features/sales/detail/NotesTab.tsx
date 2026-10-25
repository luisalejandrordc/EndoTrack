import { initials } from "../../../shared/lib/format";
import type { Sale } from "../../../shared/types";
import type { Toast } from "../../../shared/ui/toast";
import { Icon } from "../../../shared/ui/Icon";
import { Field } from "../../../shared/ui/Field";

export function NotesTab({
  sale,
  notesDraft,
  setNotesDraft,
  onSaveNotes,
  toast,
}: {
  sale: Sale;
  notesDraft: string;
  setNotesDraft: (notes: string) => void;
  onSaveNotes: (notes: string) => void;
  toast: (toast: Toast) => void;
}) {
  return (
    <div className="notes-tab">
      <div className="subsection-heading">
        <div>
          <h3>Notas internas</h3>
          <p>
            Información para el equipo comercial. No visible para el cliente.
          </p>
        </div>
        <span className="internal-badge">
          <Icon name="lock" size={13} /> Solo interno
        </span>
      </div>
      <Field label="Notas de la operación">
        <textarea
          rows={7}
          value={notesDraft}
          onChange={(event) => setNotesDraft(event.target.value)}
          placeholder="Agrega contexto, acuerdos o información para el equipo…"
        />
      </Field>
      <div className="notes-footer">
        <span>Las notas no modifican los datos originales de la venta.</span>
        <button
          className="button button-primary button-sm"
          onClick={() => {
            onSaveNotes(notesDraft);
            toast({
              title: "Notas guardadas",
              message: "La información quedó actualizada en esta sesión.",
              tone: "success",
            });
          }}
        >
          Guardar notas <Icon name="check" size={15} />
        </button>
      </div>
      <div className="note-history-item">
        <div className="avatar avatar-soft">{initials(sale.advisor)}</div>
        <div>
          <strong>{sale.advisor}</strong>
          <p>{sale.notes || "Aún no hay notas adicionales registradas."}</p>
          <small>Nota asociada a {sale.code}</small>
        </div>
      </div>
    </div>
  );
}
