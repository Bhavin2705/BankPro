const LoadingState = () => (
  <div className="container">
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '50vh',
        fontSize: '1.2rem',
        color: 'var(--text-accent)',
      }}
    >
      Loading exchange rates...
    </div>
  </div>
);

export default LoadingState;
