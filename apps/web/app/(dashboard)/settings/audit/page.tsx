const auditRows = [
  {
    action: "invite.created",
    actor: "Marina Costa",
    entity: "invite",
    period: "2026-03-13 09:42",
    tenant: "birthhub-alpha"
  },
  {
    action: "member.role_updated",
    actor: "Lucas Dias",
    entity: "member",
    period: "2026-03-13 08:30",
    tenant: "birthhub-alpha"
  },
  {
    action: "workflow.seeded",
    actor: "seed-script",
    entity: "workflow",
    period: "2026-03-13 07:15",
    tenant: "birthhub-alpha"
  }
];

export default function AuditPage() {
  return (
    <>
      <section className="hero-card">
        <span className="badge">Audit trail</span>
        <h1>Filtros por ator, ação, entidade e período</h1>
        <p>
          Esta visão já espelha o contrato de paginação cursor-based do ciclo para consumir logs
          sem `skip` pesado.
        </p>
      </section>

      <section className="panel">
        <div className="filter-row">
          <select defaultValue="all">
            <option value="all">Todas as ações</option>
            <option value="invite.created">Convites</option>
            <option value="member.role_updated">Roles</option>
            <option value="workflow.seeded">Workflows</option>
          </select>
          <select defaultValue="all">
            <option value="all">Todos os atores</option>
            <option value="marina">Marina Costa</option>
            <option value="lucas">Lucas Dias</option>
          </select>
          <button className="ghost-button" type="button">
            Data de / até
          </button>
          <button className="action-button" type="button">
            Exportar CSV
          </button>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Ação</th>
                <th>Entidade</th>
                <th>Ator</th>
                <th>Tenant</th>
              </tr>
            </thead>
            <tbody>
              {auditRows.map((row) => (
                <tr key={`${row.action}-${row.period}`}>
                  <td>{row.period}</td>
                  <td>{row.action}</td>
                  <td>{row.entity}</td>
                  <td>{row.actor}</td>
                  <td>{row.tenant}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
