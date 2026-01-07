import { Navigate } from 'react-router-dom';

/**
 * @deprecated This component has been refactored into ArticleManager and TopicManager.
 * Keeping this as a safety redirect for any lingering links.
 */
const AutoBlog = () => {
    return <Navigate to="/admin/articles" replace />;
};

export default AutoBlog;
