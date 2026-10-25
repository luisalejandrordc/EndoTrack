import { type Sale } from "../../../shared/types";
import { Icon } from "../../../shared/ui/Icon";

export function MilestoneStrip({ sale }: { sale: Sale }) {
  const milestones = sale.milestones.map((name, index) => {
    const limits = [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
      [9, 10],
      [11, 13],
    ][index];
    const tasks = sale.tasks.filter(
      (task) => task.number >= limits[0] && task.number <= limits[1],
    );
    const done = tasks.every((task) => task.status === "completed");
    const active = tasks.some(
      (task) => task.status === "in_progress" || task.status === "eligible",
    );
    return { name, number: index + 1, done, active, tasks };
  });
  const completedCount = sale.tasks.filter(
    (task) => task.status === "completed",
  ).length;
  const progress = Math.round((completedCount / sale.tasks.length) * 100);
  return (
    <section className="progress-card">
      <div className="progress-head">
        <div>
          <span className="section-kicker">PROGRESO DE LA OPERACIÓN</span>
          <h3>Ruta de endoso</h3>
        </div>
        <div className="progress-percent">
          <strong>{progress}%</strong>
          <span>completado</span>
        </div>
      </div>
      <div className="progress-track">
        <div style={{ width: `${progress}%` }} />
      </div>
      <div className="milestone-grid">
        {milestones.map((milestone) => (
          <div
            className={`milestone ${milestone.done ? "done" : milestone.active ? "current" : ""}`}
            key={milestone.name}
          >
            <div className="milestone-node">
              {milestone.done ? (
                <Icon name="check" size={15} />
              ) : (
                <span>{String(milestone.number).padStart(2, "0")}</span>
              )}
            </div>
            <div className="milestone-label">
              <strong>{milestone.name}</strong>
              <span>
                {
                  milestone.tasks.filter((task) => task.status === "completed")
                    .length
                }{" "}
                de {milestone.tasks.length} tareas
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
