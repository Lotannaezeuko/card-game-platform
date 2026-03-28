import { useSocket as useSocketContext } from '../context/SocketContext';

export default function useSocket() {
  return useSocketContext();
}
