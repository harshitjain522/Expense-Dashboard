/** Live mid-market rate: how many units of `to` one unit of `from` buys. */
export async function fetchRate(from: string, to: string): Promise<number> {
  const response = await fetch(`https://open.er-api.com/v6/latest/${from}`);
  if (!response.ok) throw new Error(`Exchange rate lookup failed (${response.status})`);
  const data = await response.json();
  const rate = data?.rates?.[to];
  if (typeof rate !== 'number' || !(rate > 0)) throw new Error(`No exchange rate from ${from} to ${to}`);
  return rate;
}
