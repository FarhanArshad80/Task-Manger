import { createContext } from 'react';

// Kept apart from AppProvider so AppContext.jsx exports only a component and
// React fast refresh can keep state while it is edited.
export const AppContext = createContext();
