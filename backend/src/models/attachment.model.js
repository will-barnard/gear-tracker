// A file attached to an item or a bundle — photos and documents (receipts,
// manuals, PDFs) share one table. The bytes live in brew-bucket; this row only
// holds where they are and what they are. Exactly one of itemId / bundleId is
// set (enforced by a CHECK constraint in migration 004).
const KINDS = ['photo', 'document'];

module.exports = (sequelize, DataTypes) => {
  const Attachment = sequelize.define('Attachment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    itemId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'items', key: 'id' },
      onDelete: 'CASCADE'
    },
    bundleId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'bundles', key: 'id' },
      onDelete: 'CASCADE'
    },
    kind: {
      type: DataTypes.STRING(16),
      allowNull: false,
      validate: { isIn: [KINDS] }
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false
    },
    contentType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    size: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    storageKey: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    // sha256 brew-bucket reports for the object; doubles as the HTTP ETag so a
    // cached photo revalidates without touching the NAS.
    storageHash: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    thumbKey: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    thumbHash: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    // Lowest-positioned photo is the cover.
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    caption: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'attachments',
    timestamps: true,
    underscored: true
  });

  Attachment.KINDS = KINDS;
  return Attachment;
};
