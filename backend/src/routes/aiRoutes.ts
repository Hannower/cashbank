import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { chatWithAi, getAiQuickPrompts } from '../controllers/aiController';

const router = Router();

// Todas as rotas de IA exigem autenticação do usuário
router.use(authMiddleware);

router.post('/chat', chatWithAi);
router.get('/quick-prompts', getAiQuickPrompts);

export default router;
