import React from 'react';
import { useSocket } from '../contexts/SocketContext';

const SocketStatus = () => {
  const { isConnected } = useSocket();

  return (
    <div className="flex items-center gap-2 text-xs font-medium">
      <span
        className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        }`}
      />
      <span className={isConnected ? 'text-green-600' : 'text-red-500'}>
        {isConnected ? 'Live' : 'Disconnected'}
      </span>
    </div>
  );
};

export default SocketStatus;
