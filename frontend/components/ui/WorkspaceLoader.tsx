export function WorkspaceLoader({ fullScreen = false }: { fullScreen?: boolean }) {
  return <div className={fullScreen ? 'loading-screen' : 'workspace-loader'} role="status" aria-live="polite" aria-label="Loading workspace">
    <div className="loader-orbit"><span className="brand-mark">R</span><i/></div>
    {!fullScreen&&<div className="loader-lines"><b/><span/><span/></div>}
    <span className="sr-only">Loading workspace</span>
  </div>;
}
