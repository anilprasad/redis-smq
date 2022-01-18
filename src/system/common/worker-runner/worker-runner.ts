import { ChildProcess, fork } from 'child_process';
import { join } from 'path';
import { readdir } from 'fs';
import { ICallback } from '../../../../types';
import { PowerManager } from '../power-manager/power-manager';
import { WorkerRunnerError } from './worker-runner.error';

export class WorkerRunner {
  protected powerManager = new PowerManager();
  protected workers: ChildProcess[] = [];

  protected onProcessExit = (): void => {
    this.workers.forEach((i) => i.kill());
  };

  run(dir: string, params: Record<string, any>, cb: ICallback<void>): void {
    this.powerManager.goingUp();
    process.once('exit', this.onProcessExit);
    readdir(dir, undefined, (err, reply) => {
      if (err) cb(err);
      else {
        (reply ?? [])
          .filter((i) => i.match(/\.worker\.js$/))
          .forEach((filename) => {
            const filepath = join(dir, filename);
            const thread = fork(filepath);
            thread.on('error', (err) => {
              if (
                this.powerManager.isGoingUp() ||
                this.powerManager.isRunning()
              ) {
                throw err;
              }
            });
            thread.on('exit', (code, signal) => {
              if (
                this.powerManager.isGoingUp() ||
                this.powerManager.isRunning()
              ) {
                throw new WorkerRunnerError(
                  `Thread [${filepath}] exited with code ${code} and signal ${signal}`,
                );
              }
            });
            thread.send(JSON.stringify(params));
            this.workers.push(thread);
          });
        this.powerManager.commit();
        cb();
      }
    });
  }

  shutdown(cb: ICallback<void>): void {
    const shutdownFn = () => {
      const worker = this.workers.pop();
      if (worker) {
        worker.once('exit', shutdownFn);
        worker.kill('SIGHUP');
      } else {
        process.removeListener('exit', this.onProcessExit);
        this.powerManager.commit();
        cb();
      }
    };
    if (this.powerManager.isRunning()) {
      this.powerManager.goingDown();
      shutdownFn();
    } else cb();
  }

  isRunning(): boolean {
    return this.powerManager.isRunning();
  }

  isDown(): boolean {
    return this.powerManager.isDown() && !this.powerManager.isGoingUp();
  }
}
