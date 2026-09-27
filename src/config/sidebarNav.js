import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  BarChart2, 
  TrendingUp, 
  Info 
} from 'lucide-react'; // Assuming lucide-react for clean icons

export const sidebarLinks = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Tasks', path: '/tasks', icon: CheckSquare },
  { label: 'Calendar', path: '/calendar', icon: Calendar },
  { label: 'Progress', path: '/progress', icon: BarChart2 },
  { label: 'Analytics', path: '/analytics', icon: TrendingUp },
  { label: 'About', path: '/about', icon: Info },
];

// The name of the page on screen, taken from the same list the sidebar is
// drawn from so the two can never disagree. Anything the list does not know
// is the not-found page, and saying so is more use than a blank.
export function pageName(pathname) {
  return sidebarLinks.find((link) => link.path === pathname)?.label || 'Not found';
}
