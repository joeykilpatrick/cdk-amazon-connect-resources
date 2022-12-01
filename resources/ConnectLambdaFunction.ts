import * as Lambda from 'aws-cdk-lib/aws-lambda';
import * as Connect from 'aws-cdk-lib/aws-connect';
import {Construct} from 'constructs';

import {ConnectLambdaFunctionAssociation} from ".";

export class ConnectLambdaFunction extends Lambda.Function {

    public readonly connectInstanceAssociation: ConnectLambdaFunctionAssociation;

    constructor(
        scope: Construct,
        id: string,
        props: Lambda.FunctionProps & { connectInstance: Connect.CfnInstance },
    ) {
        super(scope, id, props);

        this.connectInstanceAssociation = new ConnectLambdaFunctionAssociation(this, 'functionAssociation', {
            connectInstanceId: props.connectInstance.ref,
            functionArn: this.functionArn,
        });
    }

}
