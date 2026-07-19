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