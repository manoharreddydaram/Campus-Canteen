import React, { useState } from 'react';
import { seedMenuItems, setUserRole } from '../utils/seedData';
import { useAuth } from '../contexts/AuthContext';

const AdminSetupPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const addLog = (msg: string) => setLog((prev) => [...prev, msg]);

  const handleSeedMenu = async () => {
    setRunning(true);
    addLog('Starting menu seed...');
    try {
      await seedMenuItems();
      addLog('✅ Menu items seeded successfully!');
    } catch (err: any) {
      addLog(`❌ Error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const handleSetAdmin = async () => {
    if (!currentUser) return;
    setRunning(true);
    try {
      await setUserRole(currentUser.uid, 'canteen_admin');
      addLog(`✅ Set current user as canteen_admin. Refresh the page.`);
    } catch (err: any) {
      addLog(`❌ Error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⚙️</span>
          <div>
            <h1 className="font-bold text-gray-900">Admin Setup</h1>
            <p className="text-sm text-gray-500">One-time setup tools</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-700">
          <p className="font-semibold">Setup Instructions:</p>
          <ol className="list-decimal list-inside space-y-1 mt-1">
            <li>First login with your admin email/Google account</li>
            <li>Click "Make Me Admin" to set your role</li>
            <li>Refresh the page to activate admin access</li>
            <li>Click "Seed Menu Items" to populate the menu</li>
          </ol>
        </div>

        <div className="space-y-3 mb-4">
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <p className="text-gray-500">Current User: <span className="font-medium text-gray-900">{userProfile?.email || 'Not logged in'}</span></p>
            <p className="text-gray-500">Current Role: <span className="font-medium text-orange-600">{userProfile?.role || 'N/A'}</span></p>
          </div>

          <button
            onClick={handleSetAdmin}
            disabled={running || !currentUser}
            className="btn-primary w-full"
          >
            Make Me Admin (canteen_admin)
          </button>

          <button
            onClick={handleSeedMenu}
            disabled={running}
            className="btn-secondary w-full"
          >
            Seed Menu Items (12 sample items)
          </button>
        </div>

        {/* Log output */}
        {log.length > 0 && (
          <div className="bg-gray-900 rounded-lg p-3 max-h-48 overflow-y-auto">
            {log.map((line, i) => (
              <p key={i} className="text-xs text-green-400 font-mono">
                {line}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSetupPage;
