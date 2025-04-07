import { Router } from 'express';
import pagesRouter from './pages.route';
import contentTypeRouter from './content-type.route';
import contentItemRouter from './content-item.route';
import fileRouter from './file.route';

const serviceRouter = Router();

serviceRouter.use('/', pagesRouter);
serviceRouter.use('/', contentItemRouter);
serviceRouter.use('/', contentTypeRouter);
serviceRouter.use('/', fileRouter);

export default serviceRouter;
