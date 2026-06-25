const { v4: uuidv4 } = require('uuid');
const BaseModel = require('./baseModel');

class SocialAccountModel extends BaseModel {
  constructor(db) {
    super(db, 'SocialAccounts', 'socialAccountID');
  }

  findByUserId(userID) {
    return this.db
      .prepare('SELECT * FROM SocialAccounts WHERE userID = ? ORDER BY platformName ASC')
      .all(userID);
  }

  findByUserAndPlatform(userID, platformName) {
    return this.db
      .prepare('SELECT * FROM SocialAccounts WHERE userID = ? AND platformName = ?')
      .get(userID, platformName);
  }

  upsertConnection({ userID, platformName, username, oauthState, authUrl }) {
    const existing = this.findByUserAndPlatform(userID, platformName);
    const timestamp = new Date().toISOString();

    if (existing) {
      this.db.prepare(`
        UPDATE SocialAccounts
        SET username = ?, oauthState = ?, authUrl = ?, updatedAt = ?
        WHERE socialAccountID = ?
      `).run(username, oauthState, authUrl, timestamp, existing.socialAccountID);

      return this.findById(existing.socialAccountID);
    }

    const socialAccountID = uuidv4();
    this.db.prepare(`
      INSERT INTO SocialAccounts (
        socialAccountID, userID, platformName, username, oauthState, authUrl, connectedAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(socialAccountID, userID, platformName, username, oauthState, authUrl, timestamp, timestamp);

    return this.findById(socialAccountID);
  }

  disconnect(userID, platformName) {
    const result = this.db
      .prepare('DELETE FROM SocialAccounts WHERE userID = ? AND platformName = ?')
      .run(userID, platformName);

    return result.changes > 0;
  }
}

module.exports = SocialAccountModel;