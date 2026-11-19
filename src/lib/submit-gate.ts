export const createSubmitGate = () => {
  let inFlight = false;

  return {
    tryEnter(): boolean {
      if (inFlight) {
        return false;
      }
      inFlight = true;
      return true;
    },
    leave() {
      inFlight = false;
    },
    get inFlight() {
      return inFlight;
    },
  };
};
