import type { DigestNight } from '../digest/types.js';

function Missing() {
  return <span class="mute">—</span>;
}

// One table per night, sorted by job. Retries of 3 or more and any fail are marked
// (plan.md § 2a). Missing data renders as —, never as an empty cell.
export function DigestPage({ night }: { night: DigestNight }) {
  return (
    <>
      <h1>digest · {night.night}</h1>
      {night.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {night.rows.map((row) => (
              <tr>
                <td>{row.job}</td>
                <td>{row.owner === null ? <Missing /> : row.owner}</td>
                <td>{row.runs}</td>
                <td class={row.retries >= 3 ? 'warn' : undefined}>{row.retries}</td>
                <td class={row.lastStatus === 'fail' ? 'warn' : undefined}>
                  {row.lastStatus === null ? <Missing /> : row.lastStatus}
                </td>
                <td>{row.lastError === null ? <Missing /> : <span class="warn">{row.lastError}</span>}</td>
                <td>{row.firstAt === null ? <Missing /> : row.firstAt}</td>
                <td>{row.lastAt === null ? <Missing /> : row.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {night.badLines > 0 && (
        <p class="mute">
          {night.badLines} line{night.badLines === 1 ? '' : 's'} did not parse
        </p>
      )}
    </>
  );
}
