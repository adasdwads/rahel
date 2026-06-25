const express = require('express');

const createCrudRouter = (controller, middleware = []) => {
  const router = express.Router();
  const chain = Array.isArray(middleware) ? middleware : [middleware];

  router.get('/', ...chain, controller.getAll);
  router.get('/:id', ...chain, controller.getById);
  router.post('/', ...chain, controller.create);
  router.put('/:id', ...chain, controller.update);
  router.delete('/:id', ...chain, controller.remove);

  return router;
};

module.exports = createCrudRouter;