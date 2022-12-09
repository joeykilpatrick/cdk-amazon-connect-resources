import type {CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse} from "aws-lambda";
import {
    ConnectClient,
    ListPromptsCommand,
} from "@aws-sdk/client-connect";
import {Construct} from 'constructs';

import {ConnectCustomResource, ResourceType} from "./provider";

const connect = new ConnectClient({});

export interface ExistingPromptProps {
    readonly connectInstanceId: string;
    readonly promptName: string;
}

export class ConnectExistingPrompt extends ConnectCustomResource {

    public constructor(scope: Construct, id: string, props: ExistingPromptProps) {
        super(scope, id, props, ResourceType.EXISTING_PROMPT);
    }

    get attrId(): string {
        return this.getAttString('PromptId');
    }

    get attrArn(): string {
        return this.getAttString('PromptArn');
    }

    get attrName(): string {
        return this.getAttString('PromptName');
    }

    static async handleCloudFormationEvent(event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> {
        const props = JSON.parse(event.ResourceProperties.PropString) as ExistingPromptProps;
        console.log({props});

        switch (event.RequestType) {

            case "Create":
            case "Update": {

                const listCommand = new ListPromptsCommand({ // TODO Multiple pages
                    InstanceId: props.connectInstanceId,
                });
                const response = await connect.send(listCommand);

                const prompt = response.PromptSummaryList!.find(
                    (prompt) => prompt.Name === props.promptName
                );

                if (!prompt) {
                    throw Error(`Prompt "${props.promptName}" does not exist on Connect instance ${props.connectInstanceId}.`);
                }

                return {
                    ...event,
                    Status: "SUCCESS",
                    PhysicalResourceId: Date.now().toString(),
                    Data: {
                        PromptId: prompt.Id,
                        PromptArn: prompt.Arn,
                        PromptName: prompt.Name,
                    }
                };

            }

            case "Delete": {

                return {
                    ...event,
                    Status: "SUCCESS",
                };

            }

        }
    }

}
