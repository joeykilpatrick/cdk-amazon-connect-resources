import * as Lambda from 'aws-cdk-lib/aws-lambda';
import {Construct} from 'constructs';

import {ConnectLambdaFunctionAssociation} from ".";


export class ConnectLambdaFunction extends Lambda.Function {

    constructor(
        scope: Construct,
        id: string,
        private props: Lambda.FunctionProps & { connectInstanceId: string },
    ) {
        super(scope, id, props);
    }

    // Using custom association resource over built-in because the
    // built-in errors on UPDATE even if no properties have changed

    public readonly connectInstanceAssociation  = new ConnectLambdaFunctionAssociation(this, 'functionAssociation', {
        connectInstanceId: this.props.connectInstanceId,
        functionArn: this.functionArn,
    });

    // public readonly connectInstanceAssociation = new Connect.CfnIntegrationAssociation(this, 'functionAssociation', {
    //     integrationType: "LAMBDA_FUNCTION",
    //     integrationArn: this.functionArn,
    //     instanceId: this.props.connectInstance.attrArn, // Despite the fact that this says Id, it's actually Arn
    // });

}
