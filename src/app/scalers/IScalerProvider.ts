interface IScalerProvider {
  getCurrentWorkerCount(): Promise<number>
  setWorkerCount(target: number): Promise<void>
}

export type { IScalerProvider }
