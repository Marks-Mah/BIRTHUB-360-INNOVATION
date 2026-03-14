# Política de Migrations e Seed

- **Migrations:** Arquivos de migration no Prisma não devem ser alterados após realizados e mergeados (`git commit`). Qualquer modificação estrutural exigirá uma nova migration.
- **Seed:** O banco de dados de desenvolvimento deve utilizar o `seed.ts` para ser determinístico. É obrigatório que o seed sempre crie o usuário `admin@birthhub.com` e as organizações base para facilitar o setup local de novos desenvolvedores.
