class BaseModel {
  constructor(db, tableName, primaryKey) {
    this.db = db;
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  findAll(orderBy = 'timestamp DESC') {
    return this.db.prepare(`SELECT * FROM ${this.tableName} ORDER BY ${orderBy}`).all();
  }

  findById(id) {
    return this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ?`).get(id);
  }

  deleteById(id) {
    const result = this.db.prepare(`DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?`).run(id);
    return result.changes > 0;
  }
}

module.exports = BaseModel;