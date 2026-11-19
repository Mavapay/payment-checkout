export const serverClockOffsetMs = (
  serverTime: string | undefined,
  receivedAt: number,
): number => {
  if (!serverTime) {
    return 0;
  }
  const server = Date.parse(serverTime);
  if (Number.isNaN(server)) {
    return 0;
  }
  return server - receivedAt;
};

export const remainingMs = (
  targetIso: string | undefined,
  offsetMs: number,
  clientNow: number,
): number => {
  if (!targetIso) {
    return 0;
  }
  const target = Date.parse(targetIso);
  if (Number.isNaN(target)) {
    return 0;
  }
  return target - (clientNow + offsetMs);
};

export const formatCountdown = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

export const formatMinutesSeconds = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};
