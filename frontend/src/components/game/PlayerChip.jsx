export default function PlayerChip({ username, isConnected = true, isCurrentTurn = false }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border whitespace-nowrap ${
        isCurrentTurn
          ? 'bg-accent text-black border-transparent'
          : 'bg-surface3 text-text border-border'
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${
          isCurrentTurn ? 'bg-black/40' : isConnected ? 'bg-success' : 'bg-textFaint'
        }`}
      />
      {username}
    </div>
  );
}
