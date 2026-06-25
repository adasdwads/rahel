const createCrudController = (model, options = {}) => ({
  getAll: (req, res, next) => {
    try {
      const items = model.findAll();
      if (!options.ownerKey || !req.user) {
        res.json(items);
        return;
      }

      res.json(items.filter((item) => item[options.ownerKey] === req.user.userID));
    } catch (error) {
      next(error);
    }
  },
  getById: (req, res, next) => {
    try {
      const item = model.findById(req.params.id);
      if (!item) {
        return res.status(404).json({ message: 'Record not found' });
      }
      if (options.ownerKey && req.user && item[options.ownerKey] !== req.user.userID) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      return res.json(item);
    } catch (error) {
      return next(error);
    }
  },
  create: (req, res, next) => {
    try {
      const payload = options.ownerKey && req.user
        ? { ...req.body, [options.ownerKey]: req.user.userID }
        : req.body;
      const item = model.create(payload);
      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  },
  update: (req, res, next) => {
    try {
      if (options.ownerKey && req.user) {
        const existing = model.findById(req.params.id);
        if (!existing) {
          return res.status(404).json({ message: 'Record not found' });
        }
        if (existing[options.ownerKey] !== req.user.userID) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      }
      const item = model.update(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ message: 'Record not found' });
      }
      return res.json(item);
    } catch (error) {
      return next(error);
    }
  },
  remove: (req, res, next) => {
    try {
      if (options.ownerKey && req.user) {
        const existing = model.findById(req.params.id);
        if (!existing) {
          return res.status(404).json({ message: 'Record not found' });
        }
        if (existing[options.ownerKey] !== req.user.userID) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      }
      const deleted = model.deleteById(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: 'Record not found' });
      }
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }
});

module.exports = createCrudController;