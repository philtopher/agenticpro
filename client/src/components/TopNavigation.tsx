import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function TopNavigation() {
  const { user } = useAuth();

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-robot text-white text-sm"></i>
            </div>
            <h1 className="text-xl font-bold text-gray-900">AgentFlow</h1>
          </div>
          <div className="hidden md:flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button className="px-3 py-1 rounded-md bg-white text-blue-600 text-sm font-medium shadow-sm">
              Dashboard
            </button>
            <button className="px-3 py-1 rounded-md text-gray-600 text-sm font-medium hover:bg-white hover:text-blue-600 transition-colors">
              Tasks
            </button>
            <button className="px-3 py-1 rounded-md text-gray-600 text-sm font-medium hover:bg-white hover:text-blue-600 transition-colors">
              Artifacts
            </button>
            <button className="px-3 py-1 rounded-md text-gray-600 text-sm font-medium hover:bg-white hover:text-blue-600 transition-colors">
              Logs
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <i className="fas fa-bell"></i>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </button>
          <div className="flex items-center space-x-2">
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <i className="fas fa-user text-gray-600 text-xs"></i>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/api/logout'}
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
