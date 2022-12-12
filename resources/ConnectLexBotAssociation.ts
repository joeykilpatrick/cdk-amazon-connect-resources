import type {CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse} from "aws-lambda";
import crypto from "crypto";
import {
    AssociateBotCommand,
    ConnectClient,
    DisassociateBotCommand,
    LexBotConfig,
    LexVersion,
    ListBotsCommand,
    paginateListBots,
} from "@aws-sdk/client-connect";
import {Construct} from 'constructs';

import {ConnectCustomResource, ResourceType} from "./provider";

const connect = new ConnectClient({});

export interface LexBotAssociationProps {
    readonly connectInstanceId: string;
    readonly lexBotAliasArn: string;
}

export class ConnectLexBotAssociation extends ConnectCustomResource {

    public constructor(scope: Construct, id: string, props: LexBotAssociationProps) {
        super(scope, id, props, ResourceType.LEX_BOT_ASSOCIATION);
    }

    static async handleCloudFormationEvent(event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> {
        const props = JSON.parse(event.ResourceProperties.PropString) as LexBotAssociationProps;
        console.log({props});

        switch (event.RequestType) {

            case "Create":
            case "Update": {

                const bots: LexBotConfig[] = [];
                for await (const page of paginateListBots({client: connect}, {
                    InstanceId: props.connectInstanceId,
                    LexVersion: LexVersion.V2,
                })) {
                    bots.push(...page.LexBots!);
                }

                const existsAlready = bots.some(
                    (config) => config.LexV2Bot?.AliasArn === props.lexBotAliasArn
                );

                if (existsAlready) {
                    throw Error(`LexV2 Bot Alias ${props.lexBotAliasArn} is already associated to Connect instance ${props.connectInstanceId}.`);
                }

                const command = new AssociateBotCommand({
                    InstanceId: props.connectInstanceId,
                    LexV2Bot: {
                        AliasArn: props.lexBotAliasArn,
                    },
                });
                await connect.send(command);

                const propsHash = crypto.createHash('md5').update(JSON.stringify(props)).digest('hex').slice(0, 12);

                return {
                    ...event,
                    Status: "SUCCESS",
                    PhysicalResourceId: propsHash,
                };
            }

            case "Delete": {

                const listCommand = new ListBotsCommand({
                    InstanceId: props.connectInstanceId,
                    LexVersion: LexVersion.V2,
                });
                const response = await connect.send(listCommand);

                const exists = response.LexBots!.some(
                    (config) => config.LexV2Bot?.AliasArn === props.lexBotAliasArn
                );

                if (!exists) {
                    return {
                        ...event,
                        Status: "SUCCESS",
                    };
                }

                const command = new DisassociateBotCommand({
                    InstanceId: props.connectInstanceId,
                    LexV2Bot: {
                        AliasArn: props.lexBotAliasArn,
                    },
                });
                await connect.send(command);

                return {
                    ...event,
                    Status: "SUCCESS",
                };
            }

        }
    }

}
