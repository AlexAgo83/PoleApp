export type HealthStatus = {
  status: "ok";
  timestamp: string;
  uptimeSeconds: number;
};

export function getHealth(): HealthStatus {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  };
}
