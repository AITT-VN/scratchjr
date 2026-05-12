class ApplicationManagerMock {
    constructor() {
        setTimeout(() => {
            if (this._isMock()) {
                window.applicationManager = this;
            }
        }, 2000);
    }



    _isMock() {
        return !!!window.applicationManager;
    }

    getTheCurrentlySelectedDeviceOrFirstOfItsKind(type) {
        return null;
    }
    
    connectGenericCog(callback) {
        const raft = new RaftMock();
        callback(raft);
        setTimeout(() => {
            raft.publish("conn", 8)
        }, 10);
    }

    connectGenericMarty(callback) {
        const raft = new RaftMock();
        callback(raft);
        setTimeout(() => {
            raft.publish("conn", 8)
        }, 10);
    }

    disconnectGeneric(raft) {
        setTimeout(() => {
            raft.publish("conn", 3);
        }, 10)
    }

    isPhoneApp(){
    return false
    }

}

export default ApplicationManagerMock;


class RaftMock {
    constructor() {
        this._observers = {};
    }

    // RAFT observer
    subscribe(observer, topics) {
        for (const topic of topics) {
            if (!this._observers[topic]) {
                this._observers[topic] = [];
            }
            if (this._observers[topic].indexOf(observer) === -1) {
                this._observers[topic].push(observer);
            }
        }
    }

    unsubscribe(observer) {
        for (const topic in this._observers) {
            if (this._observers.hasOwnProperty(topic)) {
                const index = this._observers[topic].indexOf(observer);
                if (index !== -1) {
                    this._observers[topic].splice(index, 1);
                }
            }
        }
    }

    publish(
        eventType,
        eventEnum,
        eventName,
        eventData,
    ) {
        if (this._observers.hasOwnProperty(eventType)) {
            for (const observer of this._observers[eventType]) {
                observer.notify(eventType, eventEnum, eventName, eventData);
            }
        }
    }

    getFriendlyName() {
        return "Raft_name12344"
    }

    getBatteryStrength() {
        return 40
    }

    getRSSI () {
        return 120
    }

}