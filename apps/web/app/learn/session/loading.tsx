import styles from "./conversation-canvas.module.css";

export default function LearningSessionLoading() {
  return (
    <main>
      <section aria-labelledby="conversation-canvas-loading-title" className={styles.canvas}>
        <div className={styles.loadingShell}>
          <a className={styles.skipLink} href="#conversation-canvas-loading-title">
            Skip to activity
          </a>
          <div className={styles.sessionBar}>
            <a className={styles.backLink} href="/dashboard">
              Back to dashboard
            </a>
            <div className={styles.progressGroup}>
              <span id="conversation-canvas-loading-progress-label">Activity progress</span>
              <div
                aria-labelledby="conversation-canvas-loading-progress-label"
                aria-valuemax={1}
                aria-valuemin={0}
                aria-valuenow={0}
                className={styles.sessionProgress}
                role="progressbar"
              >
                <span />
              </div>
            </div>
          </div>
          <p className={styles.eyebrow}>Conversation Canvas</p>
          <h1 id="conversation-canvas-loading-title" tabIndex={-1}>
            Getting your activity ready
          </h1>
          <p>Checking the latest activity and your confirmed progress.</p>
        </div>
      </section>
    </main>
  );
}
