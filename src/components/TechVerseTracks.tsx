import { techVerseTrackRows } from '../models/landingTracks';
import type { techVerseTrackColumns } from '../models/landingTracks';

/** Matched formats share a row, so wrapped titles cannot shift either column. */
export default function TechVerseTracks({ columns, className }: {
  columns: ReturnType<typeof techVerseTrackColumns>;
  className?: string;
}) {
  const rows = techVerseTrackRows(columns);
  return (
    <div className={className}>
      <table className="lp-tech-tracks" aria-label="TechVerse tracks">
        <thead>
          <tr>
            <th scope="col">Computer Science</th>
            <th scope="col">Engineering</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.computerScience ?? ''}|${row.engineering ?? ''}`}>
              <td>{row.computerScience}</td>
              <td>{row.engineering}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {columns.other.length > 0 && (
        <ul className="lp-tech-tracks__other" aria-label="Other TechVerse tracks">
          {columns.other.map((title) => <li key={title}>{title}</li>)}
        </ul>
      )}
    </div>
  );
}
