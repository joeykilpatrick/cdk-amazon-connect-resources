import type {CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse} from "aws-lambda";
import * as crypto from "crypto";
import * as CDK from "aws-cdk-lib";
import {
    ConnectClient,
    CreateQueueCommand,
    CreateQueueRequest,
    ListQueuesCommand,
} from "@aws-sdk/client-connect";
import {Construct} from 'constructs';

import {ConnectCustomResource, ResourceType} from "./provider";

const connect = new ConnectClient({});

interface ConnectQueueProps extends CreateQueueRequest {
    InstanceId: string,
    Name: string,
    HoursOfOperationId: string,
    RemovalPolicy: CDK.RemovalPolicy.RETAIN, // Queues cannot be deleted.
}

export class ConnectQueue extends ConnectCustomResource {

    public constructor(scope: Construct, id: string, props: ConnectQueueProps) {
        super(scope, id, props, ResourceType.QUEUE);
        this.applyRemovalPolicy(props.RemovalPolicy);
    }

    get attrId(): CDK.Reference {
        return this.getAtt('QueueId');
    }

    get attrArn(): CDK.Reference {
        return this.getAtt('QueueArn');
    }

    static async handleCloudFormationEvent(event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> {
        const props = event.ResourceProperties as ConnectQueueProps & { ServiceToken: string };
        console.log({props});

        switch (event.RequestType) {

            case "Create": {

                const listCommand = new ListQueuesCommand({ // TODO Multiple pages
                    InstanceId: props.InstanceId,
                });
                const listCommandResponse = await connect.send(listCommand);

                const existsAlready = listCommandResponse.QueueSummaryList!.some(
                    (name) => name === props.Name,
                );

                if (existsAlready) {
                    throw Error(`Queue "${props.Name}" already exists on Connect instance ${props.InstanceId}.`);
                }

                const createCommand = new CreateQueueCommand(props);
                const createCommandResponse = await connect.send(createCommand);

                const propsHash = crypto.createHash('md5').update(JSON.stringify({
                    connectInstanceId: props.InstanceId,
                    queueName: props.Name,
                })).digest('hex').slice(0, 12);

                return {
                    ...event,
                    Status: "SUCCESS",
                    PhysicalResourceId: propsHash,
                    Data: {
                        QueueId: createCommandResponse.QueueId,
                        QueueArn: createCommandResponse.QueueArn,
                    },
                };

            }

            case "Update": {

                // TODO
                throw Error('Update action has not been implemented on ConnectQueue. Please change name to create a new queue.');

            }

            case "Delete": {

                throw Error('There is no AWS API to delete a Connect Queue. Resource must be retained and deletion skipped.');

            }

        }
    }

}
