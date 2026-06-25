const BaseModel = require('./baseModel');
const { createId, now } = require('../utils/helpers');

class UserModel extends BaseModel {
  constructor(db) {
    super(db, 'Users', 'userID');
  }

  findAll() {
    return this.db.prepare('SELECT * FROM Users ORDER BY updatedAt DESC').all().map(this.sanitizeUser);
  }

  sanitizeUser(user) {
    if (!user) {
      return null;
    }

    const { passwordHash, refreshTokenHash, biometricHash, ...safeUser } = user;
    return safeUser;
  }

  findById(id) {
    return this.sanitizeUser(super.findById(id));
  }

  findByEmail(email) {
    return this.db.prepare('SELECT * FROM Users WHERE email = ?').get(email);
  }

  findByUaePassId(uaePassID) {
    return this.db.prepare('SELECT * FROM Users WHERE uaePassID = ?').get(uaePassID);
  }

  findRawById(id) {
    return super.findById(id);
  }

  create(payload) {
    const user = {
      userID: payload.userID || createId(),
      name: payload.name,
      uaePassID: payload.uaePassID,
      email: payload.email,
      phone: payload.phone,
      passwordHash: payload.passwordHash,
      biometricHash: payload.biometricHash,
      refreshTokenHash: payload.refreshTokenHash || null,
      status: payload.status || 'Active',
      createdAt: payload.createdAt || now(),
      updatedAt: payload.updatedAt || now()
    };

    this.db.prepare(`
      INSERT INTO Users (userID, name, uaePassID, email, phone, passwordHash, biometricHash, refreshTokenHash, status, createdAt, updatedAt)
      VALUES (@userID, @name, @uaePassID, @email, @phone, @passwordHash, @biometricHash, @refreshTokenHash, @status, @createdAt, @updatedAt)
    `).run(user);

    return this.findById(user.userID);
  }

  update(id, payload) {
    const existing = this.findRawById(id);
    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      ...payload,
      userID: id,
      updatedAt: now()
    };

    this.db.prepare(`
      UPDATE Users
      SET name = @name,
          uaePassID = @uaePassID,
          email = @email,
          phone = @phone,
          passwordHash = @passwordHash,
          biometricHash = @biometricHash,
          refreshTokenHash = @refreshTokenHash,
          status = @status,
          updatedAt = @updatedAt
      WHERE userID = @userID
    `).run(updated);

    return this.findById(id);
  }

  updateRefreshToken(userID, refreshTokenHash) {
    this.db.prepare(`
      UPDATE Users
      SET refreshTokenHash = ?, updatedAt = ?
      WHERE userID = ?
    `).run(refreshTokenHash, now(), userID);
  }
}

module.exports = UserModel;