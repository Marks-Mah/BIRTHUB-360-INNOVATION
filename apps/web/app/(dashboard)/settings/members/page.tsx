const members = [
  { name: "Marina Costa", email: "marina@birthub.local", role: "Owner", status: "Ativo" },
  { name: "Lucas Dias", email: "lucas@birthub.local", role: "Admin", status: "Ativo" },
  { name: "Sara Nunes", email: "sara@birthub.local", role: "User", status: "Convidado" }
];

export default function MembersPage() {
  return (
    <>
      <section className="hero-card">
        <span className="badge">Members management</span>
        <h1>Membros, papéis e convites</h1>
        <p>
          Tela preparada para listar memberships do tenant ativo, disparar convites e administrar
          roles sem vazar contexto entre organizações.
        </p>
        <div className="hero-actions">
          <a href="/api/v1/invites">Convidar novo membro</a>
          <button className="ghost-button" type="button">
            Exportar lista
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-actions">
          <span className="badge">Tenant ativo</span>
          <span className="status-pill">3 membros</span>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Papel</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.email}>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td>
                    <select defaultValue={member.role}>
                      <option>Owner</option>
                      <option>Admin</option>
                      <option>User</option>
                    </select>
                  </td>
                  <td>
                    <span className="status-pill">{member.status}</span>
                  </td>
                  <td>
                    <div className="panel-actions">
                      <button className="ghost-button" type="button">
                        Revoke
                      </button>
                      <button className="danger-button" type="button">
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
