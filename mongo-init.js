db.createUser(
  {
    user: "root",
    pwd: "pwk372ew",
    roles: [
      {
        role: "readWrite",
        db: "atendio"
      },
      {
        role: "readWrite",
        db: "atendio-test"
      }
    ]
  }
)