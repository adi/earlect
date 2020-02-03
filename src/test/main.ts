// Copyright 2020 Adrian Punga <adrian.punga@gmail.com>
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import pino from "pino";
const logger = pino();

import { Hall, Viking } from "../";

import { NatsCommunicationMedium } from "./comm_impl";
import { LeaderWatcherLogger } from "./leader_watcher_logger_impl";

async function main() {
    try {
        const leaderWatcherLogger = await LeaderWatcherLogger.create();
        const natsCommunicationMedium = await NatsCommunicationMedium.create(["nats://127.0.0.1:4222"]);
        const hall = await Hall.create(natsCommunicationMedium);
        const viking = await Viking.createInHall(hall);
        viking.addLeaderWatcher(leaderWatcherLogger);
    } catch (err) {
        throw err;
    }
}

main()
    .then(() => {
        // process.exit(0);
    })
    .catch((err) => {
        logger.error(err);
        process.exit(1);
    });
