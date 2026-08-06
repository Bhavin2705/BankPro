const DataStatus = ({ lastUpdated, useLiveData }) => {
  if (!lastUpdated) return null;

  return (
    <div
      style={{
        textAlign: 'center',
        marginTop: '2rem',
        fontSize: '0.9rem',
        color: 'var(--text-secondary)',
        padding: '1rem',
        background: 'var(--bg-tertiary)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ marginBottom: '0.5rem' }}>
        Data Source: {useLiveData ? 'Live Exchange Rates API' : 'Stable (from last live fetch)'}
      </div>
      <div>
        Last updated: {lastUpdated.toLocaleString()}
        {!useLiveData && ' (using previously fetched rates)'}
      </div>
    </div>
  );
};

export default DataStatus;
