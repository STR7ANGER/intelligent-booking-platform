export class Metrics {
  private counters = new Map<string, number>();
  increment(name: string, labels: Record<string, string> = {}) {
    const suffix = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}="${value.replaceAll('"', "")}"`)
      .join(",");
    const metric = `booking_${name}${suffix ? `{${suffix}}` : ""}`;
    this.counters.set(metric, (this.counters.get(metric) ?? 0) + 1);
  }
  render() {
    return (
      [
        "# Booking platform bounded application metrics",
        ...[...this.counters.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, value]) => `${name} ${value}`),
      ].join("\n") + "\n"
    );
  }
}
