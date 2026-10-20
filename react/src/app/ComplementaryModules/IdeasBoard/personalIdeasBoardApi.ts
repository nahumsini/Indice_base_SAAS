import { createIdeasBoardApi } from '../../BasicModules/Sales/Funneling/ideasBoardApi';

// The complementary owner never reads or writes the Sales board namespace.
export const personalIdeasBoardApi = createIdeasBoardApi('/api/v1/ideas-board');
