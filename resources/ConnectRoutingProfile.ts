import type {CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse} from "aws-lambda";
import * as crypto from "crypto";
import {
    ConnectClient,
    CreateRoutingProfileCommand,
    CreateRoutingProfileRequest,
    ListRoutingProfilesCommand,
} from "@aws-sdk/client-connect";
import {Construct} from 'constructs';

import {ConnectCustomResource, ResourceType} from "./provider";

const connect = new ConnectClient({});

interface ConnectRoutingProfileProps extends CreateRoutingProfileRequest {
    InstanceId: string,
    Name: string,
}

export class ConnectRoutingProfile extends ConnectCustomResource {

    public constructor(scope: Construct, id: string, props: ConnectRoutingProfileProps) {
        super(scope, id, props, ResourceType.ROUTING_PROFILE);
    }

    get attrId(): string {
        return this.getAttString('RoutingProfileId');
    }

    get attrArn(): string {
        return this.getAttString('RoutingProfileArn');
    }

    static async handleCloudFormationEvent(event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> {
        const props = event.ResourceProperties as ConnectRoutingProfileProps & { ServiceToken: string };
        console.log({props});

        switch (event.RequestType) {

            case "Create": {

                const listCommand = new ListRoutingProfilesCommand({ // TODO Multiple pages
                    InstanceId: props.InstanceId,
                });
                const listCommandResponse = await connect.send(listCommand);

                const existsAlready = listCommandResponse.RoutingProfileSummaryList!.some(
                    (name) => name === props.Name,
                );

                if (existsAlready) {
                    throw Error(`Routing Profile "${props.Name}" already exists on Connect instance ${props.InstanceId}.`);
                }

                const createCommand = new CreateRoutingProfileCommand(props);
                const createCommandResponse = await connect.send(createCommand);

                const propsHash = crypto.createHash('md5').update(JSON.stringify({
                    InstanceId: props.InstanceId,
                    RoutingProfileName: props.Name,
                })).digest('hex').slice(0, 12);

                return {
                    ...event,
                    Status: "SUCCESS",
                    PhysicalResourceId: propsHash,
                    Data: {
                        RoutingProfileId: createCommandResponse.RoutingProfileId,
                        RoutingProfileArn: createCommandResponse.RoutingProfileArn,
                    },
                };

            }

            case "Update": {

                // TODO
                throw Error('Update action has not been implemented on ConnectRoutingProfile. Please change name to delete this one and create a new one.');

            }

            case "Delete": {

                throw Error('There is no AWS API to delete a Connect Routing Profile. Resource must be retained and deletion skipped.');

            }

        }
    }

}
