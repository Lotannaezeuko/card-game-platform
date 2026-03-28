export default function PlayerChip({ username, isConnected = true, isCurrentTurn = false }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${
        isCurrentTurn
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'bg-white text-gray-700 border-gray-200'
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${
          isConnected ? 'bg-green-400' : 'bg-gray-300'
        }`}
      />
      {username}
    </div>
  );
}
