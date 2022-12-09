import type {CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse} from "aws-lambda";
import * as crypto from "crypto";
import {
    ListQueuesCommand,
    CreateQueueCommand,
    CreateQueueRequest,
    ConnectClient,
} from "@aws-sdk/client-connect";
import {Construct} from 'constructs';

import {ConnectCustomResource, ResourceType} from "./provider";

const connect = new ConnectClient({});

interface ConnectQueueProps extends CreateQueueRequest {
    InstanceId: string,
    Name: string,
}

export class ConnectQueue extends ConnectCustomResource {

    public constructor(scope: Construct, id: string, props: ConnectQueueProps) {
        super(scope, id, props, ResourceType.QUEUE);
    }

    static async handleCloudFormationEvent(event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> {
        const props = event.ResourceProperties as ConnectQueueProps & { ServiceToken: string };
        console.log({props});

        switch (event.RequestType) {

            case "Create": {

                const listCommand = new ListQueuesCommand({ // TODO Multiple pages
                    InstanceId: props.InstanceId,
                });
                const response = await connect.send(listCommand);

                const existsAlready = response.QueueSummaryList!.some(
                    (name) => name === props.Name,
                );

                if (existsAlready) {
                    throw Error(`Queue "${props.Name}" already exists on Connect instance ${props.InstanceId}.`);
                }

                const createCommand = new CreateQueueCommand(props);
                await connect.send(createCommand);

                const propsHash = crypto.createHash('md5').update(JSON.stringify({
                    connectInstanceId: props.InstanceId,
                    queueName: props.Name,
                })).digest('hex').slice(0, 12);

                return {
                    ...event,
                    Status: "SUCCESS",
                    PhysicalResourceId: propsHash,
                };
            }

            case "Update": {

                // TODO
                throw Error('Update action has not been implemented on ConnectQueue. Please change name and create a new queue.');

            }

            case "Delete": {

                throw Error('There is no AWS API to delete a Connect Queue. Resource must be retained and deletion skipped.');

            }

        }
    }

}
